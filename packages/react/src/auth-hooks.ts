import {
  authStateQueryOptions,
  type CanAccessParams,
  canAccessQueryOptions,
  identityQueryOptions,
} from "@chelone/core";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useChelonAuthProvider } from "./context";

export function useGetIdentity() {
  return useQuery(identityQueryOptions(useChelonAuthProvider()));
}

export function useCanAccess(params: CanAccessParams) {
  return useQuery(canAccessQueryOptions(useChelonAuthProvider(), params));
}

export function useAuthState() {
  return useQuery(authStateQueryOptions(useChelonAuthProvider()));
}

export function useLogin() {
  const authProvider = useChelonAuthProvider();
  return useMutation({
    mutationFn: (params: Record<string, unknown>) => authProvider.login(params),
  });
}

export function useLogout() {
  const authProvider = useChelonAuthProvider();
  return useMutation({
    mutationFn: (params?: unknown) => authProvider.logout(params),
  });
}
