import PageHeader from "../components/PageHeader";
import PageTransition from "../components/PageTransition";

export default function Calendar() {
 return (
  <PageTransition>
    <div className="space-y-5">
      <PageHeader
        title="Calendar"
        subtitle="Schedule and view work order ETAs."
        actions={<button className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white ui-hover ui-focus tap-feedback">


+ Add Event</button>}
      />
<div className="rounded-2xl borderbg-white dark:bg-slate-900
border-slate-200 dark:border-slate-800
 p-5 shadow-sm ui-hover">
        <div className="text-sm text-slate-600">Next: FullCalendar styled to match GMN.</div>
      </div>
        </div>
  </PageTransition>
);

}
