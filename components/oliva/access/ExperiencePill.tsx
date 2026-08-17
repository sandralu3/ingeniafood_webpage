type ExperiencePillProps = {
  label: string;
  description: string;
};

export function ExperiencePill({ label, description }: ExperiencePillProps) {
  return (
    <div className="oliva-access-pill">
      <p className="oliva-access-pill-label">{label}</p>
      <p className="oliva-access-pill-desc">{description}</p>
    </div>
  );
}
