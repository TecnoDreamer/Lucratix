// Tokens de estilo compartilhados (strings de classes Tailwind), não componentes.
//
// Deliberado: aplicar essas classes direto em elementos nativos (<input>,
// <button>, <label>) em vez de envolvê-los em componentes React, para nao
// arriscar mudar a estrutura do DOM/associação de <label> da qual os testes
// E2E (Playwright getByLabel/getByRole) dependem.

export const input =
  "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition-all duration-150 placeholder:text-slate-400 hover:border-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50 dark:placeholder:text-slate-500 dark:hover:border-slate-600 dark:focus:border-blue-400 dark:focus:ring-blue-400/15";

export const select = `${input} appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>')] bg-no-repeat bg-[right_0.6rem_center] bg-[length:1.1rem] pr-9`;

export const label =
  "flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-300";

export const buttonBase =
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/30 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.98]";

export const buttonPrimary = `${buttonBase} bg-gradient-to-b from-blue-500 to-blue-600 px-4 py-2 text-white shadow-sm shadow-blue-600/20 hover:from-blue-500 hover:to-blue-700 hover:shadow-md hover:shadow-blue-600/25 disabled:from-blue-500 disabled:to-blue-600`;

export const buttonSecondary = `${buttonBase} border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800`;

export const buttonGhost = `${buttonBase} px-3 py-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800`;

export const buttonDanger = `${buttonBase} border border-rose-200 bg-rose-50 px-4 py-2 text-rose-700 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300 dark:hover:bg-rose-900`;

export const card =
  "rounded-xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] dark:border-slate-800 dark:bg-slate-900";

export const cardHover = `${card} transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/[0.06] dark:hover:border-blue-800`;

export const link =
  "font-medium text-blue-600 underline-offset-4 hover:underline dark:text-blue-400";

export const sectionTitle =
  "text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400";

export const tableHead =
  "border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400";

export const tableRow =
  "border-b border-slate-100 transition-colors hover:bg-slate-50 dark:border-slate-900 dark:hover:bg-slate-900/60";

export const pageContainer = "mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6";
