# Separate Pre-College Transfer Credits Container and Schema Migration

To support coursework taken outside the home institution (e.g. AP exams, dual enrollment, and college transfers) before matriculation, we decided to separate transfer credits into a dedicated Pre-College Transfer Credits Section above Year 1, rather than treating them as a regular academic year term or storing them in the server's central catalog database.

We migrated the client-side schedule model from a 4x3 array (`years[4][3]`) to an object schema (`{ transferCourses: [], years: [[], ...] }`) with automatic backward compatibility for legacy 4x3 exports. This keeps student schedule data isolated and private in client-side persistence (`localStorage` and JSON exports) without mutating the static backend course database.
