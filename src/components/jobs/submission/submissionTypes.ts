export type FV = {
  location: string;
  photoNo: string;
  sizes: { width: string; height: string }[];
  
  // Format B Fields
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: "Above" | "Below";
};

export type EditFV = {
  location: string;
  photoNo: string;
  sizes: { width: string; height: string }[];
  
  // Format B Fields
  shopName?: string;
  contactNo?: string;
  vanNo?: string;
  aboveBelow?: "Above" | "Below";
};