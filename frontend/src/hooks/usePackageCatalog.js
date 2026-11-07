
import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import { getAllPackages, packagesData } from "../data/packagesData";

export function normalizePackage(pkg) {
  const id = pkg.slug || pkg.id;
  const annual = Number(pkg.annual_price ?? pkg.price ?? 0);
  const monthly = pkg.monthly_price == null ? null : Number(pkg.monthly_price);
  const title = pkg.title || pkg.name;
  return {
    ...pkg,
    id,
    slug: id,
    title,
    name: pkg.name || title,
    displayTitle: pkg.display_title || pkg.displayTitle || title,
    annual_price: annual,
    monthly_price: monthly,
    annualPrice: pkg.annualPrice || `$${annual.toFixed(2)}`,
    annualLabel: pkg.annualLabel || `$${annual.toFixed(2)} / ${pkg.duration_months || 12} months`,
    monthlyPrice: monthly == null ? undefined : `$${monthly.toFixed(2)}`,
    monthlyLabel: monthly == null ? undefined : `$${monthly.toFixed(2)} / month`,
    duration: `${pkg.duration_months || 12} months`,
    duration_months: pkg.duration_months || 12,
    button: pkg.button_label || pkg.button || `Get ${pkg.display_title || pkg.name || "Plan"}`,
    checkoutPath: `/checkout/${id}`,
    detailsPath: pkg.details_path || pkg.detailsPath,
    features: Array.isArray(pkg.features) ? pkg.features : [],
    packageFeatures: pkg.packageFeatures || pkg.features || [],
    is_active: pkg.is_active !== false,
    sort_order: pkg.sort_order ?? 100,
  };
}

function fallbackPackages() {
  return getAllPackages().map(normalizePackage);
}

export default function usePackageCatalog() {
  const [packages, setPackages] = useState(fallbackPackages);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api.get("/api/packages")
      .then((res) => {
        if (!alive) return;
        const next = (res.data || []).map(normalizePackage).filter((pkg) => pkg.is_active);
        if (next.length) setPackages(next);
      })
      .catch((err) => console.error("Failed to load package catalog", err))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  const byId = useMemo(() => {
    const map = { ...packagesData };
    packages.forEach((pkg) => { map[pkg.id] = pkg; });
    return map;
  }, [packages]);

  return { packages, byId, loading };
}
