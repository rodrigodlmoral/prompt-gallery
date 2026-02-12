import { store } from '../store-final.js';

export const renderCollage = (p, isHero = false) => {
    if (p.type !== 'sequence' || !p.content || p.content.length === 0) {
        return `<img src="${p.image || ''}" loading="lazy">`;
    }

    // Support up to 6 items
    const items = p.content.slice(0, 6);
    const count = items.length;
    let gridStyle = '';

    // Dynamic Grid Logic
    if (count === 1) gridStyle = 'grid-template-columns: 1fr; grid-template-rows: 1fr;';
    else if (count === 2) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr;';
    else if (count === 3) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 4) gridStyle = 'grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;';
    else if (count === 5) gridStyle = 'grid-template-columns: repeat(6, 1fr); grid-template-rows: 1fr 1fr;';
    else if (count >= 6) gridStyle = 'grid-template-columns: 1fr 1fr 1fr; grid-template-rows: 1fr 1fr;';

    return `
    <div class="card-collage" style="${gridStyle}">
        ${items.map((step, idx) => {
        const { applyBlur, warningLabel } = store.getModeration(p, step.rating);
        let spanStyle = '';

        // Custom Spans for nicer layouts
        if (count === 3 && idx === 0) spanStyle = 'grid-column: span 2;';

        // 5 items: Top row 2 items (span 3), Bottom row 3 items (span 2) = Total 6 cols
        if (count === 5) {
            if (idx < 2) spanStyle = 'grid-column: span 3;'; // Top 2 items bigger
            else spanStyle = 'grid-column: span 2;'; // Bottom 3 items smaller
        }

        return `
            <div class="collage-item ${applyBlur ? 'card-blurred' : ''}" data-warning="${applyBlur ? warningLabel : ''}" style="${spanStyle}">
                <img src="${step.image}" style="width:100%; height:100%; object-fit:cover;" loading="lazy">
            </div>`;
    }).join('')
        }
    </div>`;
};
