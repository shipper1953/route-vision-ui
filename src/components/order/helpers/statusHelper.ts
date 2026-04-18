
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
    case 'error':
      return 'destructive';
    default:
      return 'secondary';
  }
};
