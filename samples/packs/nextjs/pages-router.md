---
paths:
  - "**/pages/**/*.ts"
  - "**/pages/**/*.tsx"
---

<!-- dev-harness:pack:nextjs -->

# Next.js Pages Router

- This tree is the Pages Router. Do not import `next/navigation` here.
- Keep data loading in `getServerSideProps`, `getStaticProps` or the route's existing handler.
- Navigation uses `next/link` and `next/router`.
