export function getManagedUserInitialPassword(email: string) {
  return email.trim().toLowerCase().split("@")[0];
}
