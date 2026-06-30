interface Props {
  active: boolean;
  label: string;
}

export function StatusPill({ active, label }: Props) {
  return <span className={`pill ${active ? "pillGreen" : "pillRed"}`}>{label}</span>;
}
