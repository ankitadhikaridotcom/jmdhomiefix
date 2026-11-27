export const isApprovedProviderUser = (user) => (
  Boolean(user)
  && (
    user.providerStatus === 'approved'
    || (user.role === 'provider' && user.verificationStatus === 'approved')
  )
);

export const getDefaultRouteForUser = (user) => {
  if (!user) return '/';
  if (isApprovedProviderUser(user)) return '/provider';
  if (user.role === 'admin') return '/admin';
  return '/';
};
