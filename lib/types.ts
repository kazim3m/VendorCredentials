export type UploadField = "photo" | "passportScan" | "eidFront" | "eidBack";

export type AuthenticatedUser = {
  id: string;
  email: string;
  role: "ADMIN" | "USER";
  enabled: boolean;
  personId: string | null;
};
