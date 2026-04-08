
export const getStatusBadgeVariant = (status: string) => {
  switch (status.toLowerCase()) {
    case 'ready_to_ship':
      return 'warning';
    case 'partially_shipped':
      return 'secondary';
    case 'shipped':
      return 'default';
    case 'delivered':
      return 'success';
    default:
      return 'secondary';
  }
};
