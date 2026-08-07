"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.slugify = void 0;
exports.toPrismaSection = toPrismaSection;
exports.toPrismaSectionFilter = toPrismaSectionFilter;
exports.toPublicSection = toPublicSection;
exports.buildArticlePath = buildArticlePath;
const slug_util_1 = require("../common/slug.util");
Object.defineProperty(exports, "slugify", { enumerable: true, get: function () { return slug_util_1.slugify; } });
const SECTION_TO_PREFIX = {
    featured: 'stories',
    human_stories: 'stories',
    places: 'places',
    traditions: 'traditions',
    discover: 'discover',
    voices: 'voices',
    sports: 'sports',
    events: 'events',
    video: 'video',
    campaigns: 'campaigns',
    gallery: 'gallery',
};
function toPrismaSection(section) {
    if (section === 'stories') {
        return 'human_stories';
    }
    const normalized = section === 'human-stories' ? 'human_stories' : section;
    if (!(normalized in SECTION_TO_PREFIX)) {
        throw new Error(`Invalid section: ${section}`);
    }
    return normalized;
}
/** Sections filter for public list/detail (stories maps to both featured + human_stories). */
function toPrismaSectionFilter(section) {
    if (!section)
        return undefined;
    if (section === 'stories') {
        return { in: ['featured', 'human_stories'] };
    }
    return toPrismaSection(section);
}
function toPublicSection(section) {
    return section === 'human_stories'
        ? 'human-stories'
        : section;
}
function buildArticlePath(section, slug) {
    return `/${SECTION_TO_PREFIX[section]}/${slug}`;
}
