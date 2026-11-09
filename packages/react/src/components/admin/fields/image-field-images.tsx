import type { ImageFieldSource } from "@chelone/core";

/**
 * What an image field renders inside its `<span>`: a `<ul>` of `<img>` for an
 * array, else the one `<img>`. It calls no hook, so `ImageField` and the
 * server `ServerImageField` both render it.
 */
function ImageFieldImages({
  images,
  list,
}: {
  /** What core's `imageFieldSources` returned. */
  images: ImageFieldSource[];
  /** Whether the value was an array. */
  list: boolean;
}) {
  if (list) {
    return (
      <ul>
        {images.map((image, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: an unsafe `src` is dropped, so it cannot key the row.
          <li key={index}>
            <img alt={image.title} title={image.title} src={image.src} />
          </li>
        ))}
      </ul>
    );
  }
  const [image] = images;
  return <img title={image?.title} alt={image?.title} src={image?.src} />;
}

export { ImageFieldImages };
