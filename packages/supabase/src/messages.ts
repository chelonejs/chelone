import { defineMessages } from "@chelone/core";

/**
 * English text for the Supabase login, forgot password and set password pages.
 * Keys keep the `ra-supabase.` prefix so a catalog written for ra-supabase
 * carries over. Text from ra-supabase-language-english (MIT), with
 * `%{provider}` written `{provider}`.
 */
export const supabaseEnglishMessages = defineMessages({
  "ra-supabase.auth.email": "Email",
  "ra-supabase.auth.confirm_password": "Confirm password",
  "ra-supabase.auth.sign_in_with": "Sign in with {provider}",
  "ra-supabase.auth.forgot_password": "Forgot password?",
  "ra-supabase.auth.reset_password": "Reset password",
  "ra-supabase.auth.password_reset":
    "Check your emails for the password reset link",
  "ra-supabase.auth.missing_tokens":
    "Access and refresh tokens are missing from the link",
  "ra-supabase.auth.back_to_login": "Back to login",
  "ra-supabase.reset_password.forgot_password": "Forgot your password?",
  "ra-supabase.reset_password.forgot_password_details":
    "Enter your email to receive a link to reset your password.",
  "ra-supabase.set_password.new_password": "Choose your password",
  "ra-supabase.validation.password_mismatch": "Passwords do not match",
});

/** French text for the same pages, from ra-supabase-language-french (MIT). */
export const supabaseFrenchMessages = defineMessages({
  "ra-supabase.auth.email": "Email",
  "ra-supabase.auth.confirm_password": "Confirmer le mot de passe",
  "ra-supabase.auth.sign_in_with": "Se connecter avec {provider}",
  "ra-supabase.auth.forgot_password": "Mot de passe oublié ?",
  "ra-supabase.auth.reset_password": "Réinitialiser le mot de passe",
  "ra-supabase.auth.password_reset":
    "Consultez vos emails pour le lien de réinitialisation du mot de passe",
  "ra-supabase.auth.missing_tokens":
    "Les jetons d'accès et d'actualisation sont absents du lien",
  "ra-supabase.auth.back_to_login": "Retour à la connexion",
  "ra-supabase.reset_password.forgot_password": "Mot de passe oublié ?",
  "ra-supabase.reset_password.forgot_password_details":
    "Saisissez votre email pour recevoir un lien de réinitialisation de votre mot de passe.",
  "ra-supabase.set_password.new_password": "Choisissez votre mot de passe",
  "ra-supabase.validation.password_mismatch":
    "Les mots de passe ne correspondent pas",
});
