/**
 * The Status page: one button per state an admin falls into while it waits,
 * fails or is out of date, so each loading, empty and error component can be
 * seen working. A URL no route owns lands on `<NotFound>`, the app's catch-all
 * (see `App.tsx`): `/nowhere` is one.
 */

import { createFakeDeploy } from "@chelone/demo-data";
import {
  ApplicationUpdatedNotification,
  CheckForApplicationUpdate,
  Error as ErrorPage,
  LinearProgress,
  Link,
  Loading,
  LoadingInput,
  Offline,
  Placeholder,
  Ready,
  ShellErrorBoundary,
  useNotify,
} from "@chelone/react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

export const title = "Status";
export const group = "System";

/** A titled box with a toggle button and, once it is on, the state it shows. */
function State({
  name,
  description,
  label,
  active = false,
  onToggle,
  children,
}: {
  name: string;
  description: string;
  label: string;
  active?: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label={name}
      className="flex flex-col gap-3 rounded-md border p-4"
    >
      <div>
        <h2 className="font-medium">{name}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-pressed={children ? active : undefined}
          onClick={onToggle}
        >
          {label}
        </Button>
      </div>
      {active ? <div className="min-h-16">{children}</div> : null}
    </section>
  );
}

function useToggle(): [boolean, () => void] {
  const [on, setOn] = useState(false);
  return [on, () => setOn((value) => !value)];
}

function Crash(): never {
  throw new Error("The posts could not be loaded.");
}

/** Dispatches the events `<Offline>` listens for, so a browser that is online can be shown offline. */
function SimulateOffline({ children }: { children: ReactNode }) {
  useEffect(() => {
    window.dispatchEvent(new Event("offline"));
    return () => {
      window.dispatchEvent(new Event("online"));
    };
  }, []);
  return <>{children}</>;
}

function NotifyState() {
  const notify = useNotify();
  return (
    <State
      name="Notification"
      description="A toast from the queue useNotify pushes into, with a close button."
      label="Fire a notification"
      onToggle={() => notify("Post saved", { type: "success" })}
    />
  );
}

function UpdateCheckState() {
  const [checking, setChecking] = useState(false);
  const [released, setReleased] = useState(false);
  const [deploy] = useState(createFakeDeploy);
  const uninstall = useRef<(() => void) | undefined>(undefined);
  // Installed when the button is pressed, not in an effect: the check mounts
  // first and fetches at once, so it has to find the fake already in place.
  const stop = () => {
    uninstall.current?.();
    uninstall.current = undefined;
  };
  useEffect(() => () => uninstall.current?.(), []);
  return (
    <State
      name="Check for application update"
      description="Polls the deployed page and shows the update prompt once its body changes."
      label="Check for a new version"
      active={checking}
      onToggle={() => {
        stop();
        if (!checking) uninstall.current = deploy.install();
        setReleased(false);
        setChecking(!checking);
      }}
    >
      <CheckForApplicationUpdate
        disabled={false}
        url={deploy.url}
        interval={200}
        notification={
          <ApplicationUpdatedNotification className="static translate-x-0 flex-wrap" />
        }
      />
      {released ? null : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">
            The application is up to date.
          </p>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              deploy.release();
              setReleased(true);
            }}
          >
            Release a new version
          </Button>
        </div>
      )}
    </State>
  );
}

export default function StatusPage() {
  const [loading, toggleLoading] = useToggle();
  const [loadingInput, toggleLoadingInput] = useToggle();
  const [progress, toggleProgress] = useToggle();
  const [placeholder, togglePlaceholder] = useToggle();
  const [error, toggleError] = useToggle();
  const [offline, toggleOffline] = useToggle();
  const [ready, toggleReady] = useToggle();
  const [updated, toggleUpdated] = useToggle();

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <State
        name="Loading"
        description="The spinner and message for a page that is slow to load."
        label="Show loading"
        active={loading}
        onToggle={toggleLoading}
      >
        <Loading
          delay={0}
          loadingPrimary="Loading posts"
          loadingSecondary="Please wait while your records load."
        />
      </State>
      <State
        name="Loading input"
        description="A disabled input that holds a form field's place while its data loads."
        label="Show a loading input"
        active={loadingInput}
        onToggle={toggleLoadingInput}
      >
        <LoadingInput label="Author" timeout={0} />
      </State>
      <State
        name="Linear progress"
        description="An indeterminate bar for a field that is still loading."
        label="Show progress"
        active={progress}
        onToggle={toggleProgress}
      >
        <LinearProgress timeout={0} />
      </State>
      <State
        name="Placeholder"
        description="A muted bar that holds a field's height until its value lands."
        label="Show a placeholder"
        active={placeholder}
        onToggle={togglePlaceholder}
      >
        <p className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Title</span>
          <Placeholder className="h-5 w-40" />
        </p>
      </State>
      <State
        name="Error"
        description="The page a crashed route falls back to. Back returns to the page before."
        label="Crash the page"
        active={error}
        onToggle={toggleError}
      >
        <ShellErrorBoundary
          fallback={({ error: thrown, errorInfo, resetErrorBoundary }) => (
            <ErrorPage
              error={thrown}
              errorInfo={errorInfo}
              resetErrorBoundary={resetErrorBoundary}
            />
          )}
        >
          <Crash />
        </ShellErrorBoundary>
      </State>
      <section
        aria-label="Not found"
        className="flex flex-col gap-3 rounded-md border p-4"
      >
        <div>
          <h2 className="font-medium">Not found</h2>
          <p className="text-sm text-muted-foreground">
            A URL no route owns shows the not-found page.
          </p>
        </div>
        <div>
          <Link to="/nowhere" className="text-sm">
            Open a wrong URL
          </Link>
        </div>
      </section>
      <State
        name="Offline"
        description="What the app shows when the browser loses its connection."
        label="Go offline"
        active={offline}
        onToggle={toggleOffline}
      >
        <SimulateOffline>
          <Offline>
            <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm">
              No connection. The list is showing cached posts.
            </div>
          </Offline>
        </SimulateOffline>
      </State>
      <NotifyState />
      <State
        name="Application updated notification"
        description="The prompt that offers a reload when a new version is live."
        label="Show the update prompt"
        active={updated}
        onToggle={toggleUpdated}
      >
        <ApplicationUpdatedNotification />
      </State>
      <UpdateCheckState />
      <State
        name="Ready"
        description="The splash an Admin shows until it has a Resource."
        label="Show the splash"
        active={ready}
        onToggle={toggleReady}
      >
        <div className="fixed inset-0 z-50 bg-background">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute top-4 right-4 z-10"
            onClick={toggleReady}
          >
            Close the splash
          </Button>
          <Ready />
        </div>
      </State>
    </div>
  );
}
