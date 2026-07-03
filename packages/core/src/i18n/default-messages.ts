import { defineMessages } from "./messages";

/**
 * English defaults for every i18n key the core controllers emit. Apps merge
 * these under their own catalogs (`{ ...defaultMessages, ...appMessages }`);
 * resource-scoped keys (`resources.{name}.notifications.{event}`) override
 * them through the translate-fallback pattern.
 */
export const defaultMessages = defineMessages({
  "chelone.message.invalid_form":
    "The form is not valid. Please check for errors",
  "chelone.message.select_all_limit_reached":
    "There are too many elements to select them all. Only the first {max} elements were selected",
  "chelone.notification.created": "Element created",
  "chelone.notification.deleted": "Element deleted",
  "chelone.notification.http_error": "Server communication error",
  "chelone.notification.item_doesnt_exist": "Element does not exist",
  "chelone.notification.updated": "Element updated",
  "chelone.validation.email": "Must be a valid email",
  "chelone.validation.maxLength": "Must be {max} characters or less",
  "chelone.validation.maxValue": "Must be {max} or less",
  "chelone.validation.minLength": "Must be {min} characters at least",
  "chelone.validation.minValue": "Must be at least {min}",
  "chelone.validation.number": "Must be a number",
  "chelone.validation.oneOf": "Must be one of: {options}",
  "chelone.validation.regex":
    "Must match a specific format (regexp): {pattern}",
  "chelone.validation.required": "Required",
});
