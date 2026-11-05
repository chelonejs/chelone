/**
 * `<CsvImport>` — an Import button that opens a four-step dialog: upload a CSV
 * file, map its columns to fields, preview the rows, then create them.
 */

import {
  type CsvImportReport,
  type DataProvider,
  downloadCSV,
  fakeDataProvider,
} from "@chelone/core";
import { QueryClient } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { CheloneProvider } from "../../../context";
import { ResourceContextProvider } from "../../../resource";
import { CsvImport } from "./csv-import";
import { useCsvImport } from "./use-csv-import";

vi.mock("@chelone/core", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@chelone/core")>()),
  downloadCSV: vi.fn(),
}));

beforeEach(() => {
  vi.mocked(downloadCSV).mockClear();
});
afterEach(cleanup);

const schema = z.object({
  title: z.string().min(1),
  views: z.coerce.number(),
  note: z.string().optional(),
});

const GOOD_CSV = "title,views\nHello,1\nWorld,2\n";
const MIXED_CSV = "title,views\nHello,1\n,2\nWorld,3\n";

/** The `DataTransfer` a browser hands a file drop. */
function fileTransfer(...files: File[]) {
  return {
    files,
    items: files.map((file) => ({
      kind: "file",
      type: file.type,
      getAsFile: () => file,
    })),
    types: ["Files"],
  };
}

function makeProvider(): DataProvider {
  return fakeDataProvider({ posts: [] });
}

function Providers({
  dataProvider,
  children,
}: {
  dataProvider: DataProvider;
  children: ReactNode;
}) {
  return (
    <CheloneProvider
      dataProvider={dataProvider}
      queryClient={new QueryClient()}
    >
      <ResourceContextProvider value="posts">
        {children}
      </ResourceContextProvider>
    </CheloneProvider>
  );
}

const uploadFile = async (text: string, name = "posts.csv") => {
  const input = screen.getByTestId("csv-file-input");
  const file = new File([text], name, { type: "text/csv" });
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } });
  });
};

const openDialog = () => {
  fireEvent.click(screen.getByRole("button", { name: "Import" }));
  return screen.getByRole("dialog");
};

const button = (name: string) => screen.getByRole("button", { name });
const nextButton = () => button("Next");
const mapSelect = (field: string) =>
  document.querySelector(
    `select[data-csv-field="${field}"]`,
  ) as HTMLSelectElement;

const heading = (name: string) => screen.findByRole("heading", { name });
const parsed = (text: string | RegExp) =>
  waitFor(() => expect(screen.getByText(text)).toBeDefined());

async function runToCommit(csv: string) {
  await uploadFile(csv);
  await parsed(/rows parsed/);
  fireEvent.click(nextButton());
  await heading("Map columns");
  fireEvent.click(nextButton());
  await heading("Preview");
  fireEvent.click(nextButton());
}

describe("<CsvImport>", () => {
  it("an Import button opens the dialog on the upload step", () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    expect(screen.queryByRole("dialog")).toBeNull();

    const dialog = openDialog();

    expect(
      within(dialog).getByRole("heading", { name: "Upload" }),
    ).toBeDefined();
    expect(screen.getByTestId("csv-file-input")).toBeDefined();
    expect(nextButton().hasAttribute("disabled")).toBe(true);
  });

  it("uploading a CSV file shows its row count and enables Next", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();

    await uploadFile(GOOD_CSV);

    await parsed("2 rows parsed");
    expect(nextButton().hasAttribute("disabled")).toBe(false);
  });

  it("a file with a parse error shows the message and stays on the upload step", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();

    await uploadFile('title,views\n"Hello,1\n');

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/quote/i);
    expect(screen.queryByText(/rows parsed/)).toBeNull();
    expect(nextButton().hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("heading", { name: "Upload" })).toBeDefined();
  });

  it("says a dropped file of the wrong type was refused", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    const dropzone = screen.getByTestId("csv-file-input")
      .parentElement as HTMLElement;
    const file = new File(["title\nHello"], "posts.txt", {
      type: "text/plain",
    });

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: fileTransfer(file),
      });
    });

    await waitFor(() =>
      expect(screen.getByText("Choose a .csv file")).toBeDefined(),
    );
    expect(nextButton().hasAttribute("disabled")).toBe(true);
  });

  it("does not call several dropped .csv files the wrong type", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    const dropzone = screen.getByTestId("csv-file-input")
      .parentElement as HTMLElement;
    const first = new File([GOOD_CSV], "first.csv", { type: "text/csv" });
    const second = new File(["title\nOther\n"], "second.csv", {
      type: "text/csv",
    });

    await act(async () => {
      fireEvent.drop(dropzone, {
        dataTransfer: fileTransfer(first, second),
      });
    });

    await parsed("2 rows parsed");
    expect(screen.queryByText("Choose a .csv file")).toBeNull();
  });

  it("warns when the file is not UTF-8", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    // "Caf\xe9" in Windows-1252, which is not valid UTF-8.
    const bytes = new Uint8Array([
      ...new TextEncoder().encode("title,views\nCaf"),
      0xe9,
      ...new TextEncoder().encode(",1\n"),
    ]);
    const input = screen.getByTestId("csv-file-input");
    const file = new File([bytes], "posts.csv", { type: "text/csv" });

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await parsed(
      "This file is not UTF-8, so some letters may be wrong. Save it as CSV UTF-8 and try again.",
    );
    expect(screen.getByText("1 rows parsed")).toBeDefined();
    expect(nextButton().hasAttribute("disabled")).toBe(false);
  });

  it("the map step selects the header that matches each schema field", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    await uploadFile("Views,TITLE,extra\n1,Hello,x\n");
    await parsed("1 rows parsed");

    fireEvent.click(nextButton());

    await heading("Map columns");
    expect(mapSelect("title").value).toBe("TITLE");
    expect(mapSelect("views").value).toBe("Views");
    expect(mapSelect("note").value).toBe("");
    expect(screen.getAllByText("*")).toHaveLength(2);
  });

  it("Next on the map step stays put while a required field is unmapped", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    await uploadFile(GOOD_CSV);
    await parsed("2 rows parsed");
    fireEvent.click(nextButton());
    await heading("Map columns");

    fireEvent.change(mapSelect("title"), { target: { value: "" } });

    expect(screen.getByText(/required fields are not mapped/i)).toBeDefined();
    fireEvent.click(nextButton());
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "Map columns" })).toBeDefined();
  });

  it("the preview counts valid rows and rows with errors", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    await uploadFile(MIXED_CSV);
    await parsed("3 rows parsed");
    fireEvent.click(nextButton());
    await heading("Map columns");
    fireEvent.click(nextButton());

    await heading("Preview");
    expect(screen.getByText("2 valid · 1 errors · 3 total")).toBeDefined();
    expect(screen.getByRole("columnheader", { name: "Issues" })).toBeDefined();
    expect(screen.getAllByRole("row")).toHaveLength(4);
  });
});

describe("<CsvImport> commit step", () => {
  it("the commit step creates each valid row with dataProvider.create and shows Import complete", async () => {
    const dataProvider = makeProvider();
    const create = vi.spyOn(dataProvider, "create");
    const onComplete = vi.fn();
    render(
      <Providers dataProvider={dataProvider}>
        <CsvImport schema={schema} onComplete={onComplete} />
      </Providers>,
    );
    openDialog();

    await runToCommit(GOOD_CSV);

    await screen.findByText("Import complete");
    expect(create).toHaveBeenCalledTimes(2);
    expect(create).toHaveBeenCalledWith("posts", {
      data: { title: "Hello", views: 1 },
    });
    expect(create).toHaveBeenCalledWith("posts", {
      data: { title: "World", views: 2 },
    });
    expect(screen.getByText("2 created · 0 failed · 2 total")).toBeDefined();
    expect(
      screen.queryByRole("button", { name: "Download error report" }),
    ).toBeNull();
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(
      screen.getAllByRole("button", { name: "Close" }).length,
    ).toBeGreaterThan(0);
  });

  it("a row that fails to create is in the report and Download error report calls downloadCSV with it", async () => {
    const dataProvider = makeProvider();
    const real = dataProvider.create.bind(dataProvider);
    vi.spyOn(dataProvider, "create").mockImplementation(
      async (resource, params) => {
        if (params.data.title === "World") {
          throw new Error("duplicate title");
        }
        return real(resource, params);
      },
    );
    let report: CsvImportReport | undefined;
    render(
      <Providers dataProvider={dataProvider}>
        <CsvImport
          schema={schema}
          onComplete={(r) => {
            report = r;
          }}
        />
      </Providers>,
    );
    openDialog();

    await runToCommit(GOOD_CSV);

    await screen.findByText("Import complete");
    expect(screen.getByText("1 created · 1 failed · 2 total")).toBeDefined();
    expect(report?.errors).toHaveLength(1);

    fireEvent.click(button("Download error report"));

    expect(downloadCSV).toHaveBeenCalledTimes(1);
    const [csv, filename] = vi.mocked(downloadCSV).mock.calls[0] ?? [];
    expect(filename).toBe("import-errors");
    expect(csv).toContain("duplicate title");
    expect(csv).toContain("World");
  });

  it("a new onComplete between renders does not import twice", async () => {
    const dataProvider = makeProvider();
    const create = vi.spyOn(dataProvider, "create");
    const first = vi.fn();
    const second = vi.fn();
    const tree = (onComplete: () => void) => (
      <Providers dataProvider={dataProvider}>
        <CsvImport schema={schema} onComplete={onComplete} />
      </Providers>
    );
    const view = render(tree(first));
    openDialog();
    await uploadFile(GOOD_CSV);
    await parsed(/rows parsed/);

    view.rerender(tree(second));
    fireEvent.click(nextButton());
    await heading("Map columns");
    fireEvent.click(nextButton());
    await heading("Preview");
    view.rerender(tree(vi.fn()));
    fireEvent.click(nextButton());
    await screen.findByText("Import complete");
    view.rerender(tree(vi.fn()));
    await act(async () => {});

    expect(create).toHaveBeenCalledTimes(2);
    expect(first).not.toHaveBeenCalled();
  });
});

describe("<CsvImport> closing", () => {
  it("closing the dialog clears the file and the mapping", async () => {
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema} />
      </Providers>,
    );
    openDialog();
    await uploadFile("Views,TITLE\n1,Hello\n");
    await parsed(/rows parsed/);
    fireEvent.click(nextButton());
    await heading("Map columns");
    fireEvent.change(mapSelect("title"), { target: { value: "Views" } });
    expect(mapSelect("title").value).toBe("Views");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    openDialog();

    expect(screen.getByRole("heading", { name: "Upload" })).toBeDefined();
    expect(screen.queryByText(/rows parsed/)).toBeNull();
    expect(nextButton().hasAttribute("disabled")).toBe(true);

    await uploadFile("Views,TITLE\n1,Hello\n");
    await parsed(/rows parsed/);
    fireEvent.click(nextButton());
    await heading("Map columns");
    expect(mapSelect("title").value).toBe("TITLE");
  });

  it("children render inside the context and can call useCsvImport", () => {
    function Probe() {
      const { state } = useCsvImport();
      return <p>step is {state.step}</p>;
    }
    render(
      <Providers dataProvider={makeProvider()}>
        <CsvImport schema={schema}>
          <Probe />
        </CsvImport>
      </Providers>,
    );
    openDialog();
    expect(screen.getByText("step is upload")).toBeDefined();
  });
});

describe("useCsvImport", () => {
  it("useCsvImport throws outside CsvImport", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCsvImport())).toThrow(
      "useCsvImport must be used inside <CsvImport>",
    );
    spy.mockRestore();
  });
});
