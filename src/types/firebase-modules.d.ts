// Custom ambient declarations to resolve firebase sub-package type resolution
// issue with moduleResolution: bundler (the installed firebase@10 package has
// missing .d.ts files in its sub-package package.json typings fields).
// This re-exports types from the underlying @firebase packages which do have
// proper type declarations.

declare module 'firebase/firestore' {
  export * from '@firebase/firestore';
}

declare module 'firebase/app' {
  export * from '@firebase/app';
}

declare module 'firebase/analytics' {
  export * from '@firebase/analytics';
}

declare module 'firebase/auth' {
  export * from '@firebase/auth';
}

declare module 'firebase/storage' {
  export * from '@firebase/storage';
}

declare module 'firebase/messaging' {
  export * from '@firebase/messaging';
}
