export function formatDate(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatMonth(date: Date) {
  return date.toLocaleDateString("en-us", {
    year: "numeric",
    month: "long",
  });
}
