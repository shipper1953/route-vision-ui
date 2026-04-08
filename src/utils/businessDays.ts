export function addBusinessDays(startDate: Date, businessDaysToAdd: number): Date {
  const result = new Date(startDate);
  let daysAdded = 0;

  while (daysAdded < businessDaysToAdd) {
    result.setDate(result.getDate() + 1);
    const day = result.getDay();

    if (day !== 0 && day !== 6) {
      daysAdded += 1;
    }
  }

  return result;
}

export function getDefaultRequiredDeliveryDate(): Date {
  return addBusinessDays(new Date(), 5);
}
