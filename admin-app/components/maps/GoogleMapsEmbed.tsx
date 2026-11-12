export function GoogleMapsEmbed({
  query,
  title,
  className,
}: {
  query: string;
  title: string;
  className: string;
}) {
  return (
    <iframe
      title={title}
      src={`https://maps.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
      loading="lazy"
      allowFullScreen
      referrerPolicy="no-referrer-when-downgrade"
      className={className}
    />
  );
}
