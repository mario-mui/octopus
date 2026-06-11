// The async boundary required by Module Federation: deferring the real entry
// behind a dynamic import lets shared singletons initialise first.
import('./bootstrap');

export {};
