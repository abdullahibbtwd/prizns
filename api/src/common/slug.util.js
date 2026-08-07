"use strict";
/**
 * Shared slug helpers for articles, authors, series, and future entities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = slugify;
exports.randomSlugDigits = randomSlugDigits;
exports.ensureUniqueSlug = ensureUniqueSlug;
/** Normalize a human title/name into a URL slug. */
function slugify(input) {
    return (input
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9а-яё\s-]/giu, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 80) || 'untitled');
}
/** Zero-padded numeric suffix, e.g. "4839201". */
function randomSlugDigits(length = 7) {
    const max = 10 ** length;
    const n = Math.floor(Math.random() * max);
    return String(n).padStart(length, '0');
}
/**
 * Build a unique slug from `source`.
 * Tries the bare slugify first; on collision appends `-{7 random digits}` and retries.
 *
 * @param source - Title / name (or any string to slugify)
 * @param isTaken - Return true if this slug is already used
 */
async function ensureUniqueSlug(source, isTaken, options = {}) {
    const randomDigits = options.randomDigits ?? 7;
    const maxAttempts = options.maxAttempts ?? 25;
    const base = slugify(source);
    if (!(await isTaken(base)))
        return base;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const candidate = `${base}-${randomSlugDigits(randomDigits)}`;
        if (!(await isTaken(candidate)))
            return candidate;
    }
    // Extremely unlikely fallback
    return `${base}-${Date.now().toString(36)}`;
}
