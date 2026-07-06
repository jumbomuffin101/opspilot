interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  centered = false,
}: SectionHeadingProps) {
  return (
    <div className={centered ? "mx-auto max-w-3xl text-center" : "max-w-3xl"}>
      <p className="font-mono text-xs font-medium uppercase tracking-[.24em] text-violet-300">
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl font-semibold tracking-[-.04em] text-white sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-5 text-base leading-7 text-slate-400 sm:text-lg">{description}</p>
      ) : null}
    </div>
  );
}
