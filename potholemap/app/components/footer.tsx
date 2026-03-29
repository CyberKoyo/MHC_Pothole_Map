export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-4 text-center text-xs z-50 relative shrink-0">
      <p>&copy; {new Date().getFullYear()} PotholeMap &mdash; built for HackMHC. Watch your step!</p>
    </footer>
  );
}