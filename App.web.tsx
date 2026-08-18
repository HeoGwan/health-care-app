/**
 * React Native Web entry point.
 * Exercise routes are loaded independently so native-only healthcare modules
 * do not execute before the exercise page can mount.
 */

import React, { Suspense, lazy } from 'react';

const AppNavigator = lazy(() =>
  import('./src/screens/AppNavigator').then(module => ({
    default: module.AppNavigator,
  })),
);

// Exercise has a separate web design system. Lazy-loading its entry keeps the
// dashboard CSS out of the existing healthcare screens.
const ExerciseEntry = lazy(() => import('./src/exercise/ExerciseEntry'));

const App = () => {
  const isExerciseRoute =
    typeof window !== 'undefined' &&
    window.location.pathname.startsWith('/exercise');

  if (isExerciseRoute) {
    return (
      <Suspense fallback={null}>
        <ExerciseEntry />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={null}>
      <AppNavigator />
    </Suspense>
  );
};

export default App;
