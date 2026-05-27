import { createNavigationContainerRef } from "@react-navigation/native"

/**
 * Single navigation ref shared across the app for imperative nav from
 * outside the React tree (e.g. push notification tap handlers).
 */
const navigationRef = createNavigationContainerRef<Record<string, object | undefined>>()

export { navigationRef }
