type Props = {
  title: string;
  sprint: string;
  description: string;
};

export default function ComingSoon({ title, sprint, description }: Props) {
  return (
    <div className="animate-fadeIn">
      <div className="mb-8">
        <h1 className="font-display text-[32px] text-noir">{title}</h1>
        <p className="mt-1 text-sm text-gris-moyen">{description}</p>
      </div>

      <div className="rounded-2xl border border-gris-border bg-white p-12 text-center">
        <div className="mx-auto inline-flex items-center justify-center rounded-full bg-dore-pale px-5 py-1.5 text-xs font-bold uppercase tracking-wider text-dore">
          {sprint}
        </div>
        <p className="mt-5 font-display text-2xl text-noir">Module en construction</p>
        <p className="mx-auto mt-3 max-w-md text-gris-moyen">
          Cette page sera développée lors du sprint indiqué ci-dessus, après la
          mise en place de la base de données Supabase.
        </p>
      </div>
    </div>
  );
}
