import { toast } from "sonner";

export const showSuccess = (message: string) => {
  toast.success(message);
};

export const showImportantSuccess = (message: string) => {
  toast.success(message, {
    duration: 15000,
    className: "text-base md:text-lg",
  });
};

export const showError = (message: string) => {
  toast.error(message);
};

export const showImportantError = (message: string) => {
  toast.error(message, {
    duration: 15000,
    className: "text-base md:text-lg",
  });
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};
