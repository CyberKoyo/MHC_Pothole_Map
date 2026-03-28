export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 py-3 text-center text-xs sm:text-sm z-50 relative shrink-0">
      <p>&copy; {new Date().getFullYear()} PotholeMap for HackMHC. Watch your step!</p>
    </footer>
  );
}