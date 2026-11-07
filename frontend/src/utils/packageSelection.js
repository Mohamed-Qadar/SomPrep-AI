import { getPackageById } from "../data/packagesData";

export function getPackageCheckoutPath(packageId) {
  const selectedPackage = getPackageById(packageId);
  if (!selectedPackage) return "/packages";
  return `/paywall?package=${encodeURIComponent(selectedPackage.id)}&redirect=${encodeURIComponent("/dashboard")}`;
}

export function handlePackageSelect({ packageId, user, navigate }) {
  const checkoutPath = getPackageCheckoutPath(packageId);
  localStorage.setItem("selectedPackage", packageId);

  if (user) {
    navigate(checkoutPath);
    return;
  }

  navigate(`/login?redirect=${encodeURIComponent(checkoutPath)}`);
}

export function consumeSelectedPackageCheckoutPath() {
  const packageId = localStorage.getItem("selectedPackage");
  if (!packageId) return null;
  localStorage.removeItem("selectedPackage");
  return getPackageCheckoutPath(packageId);
}
