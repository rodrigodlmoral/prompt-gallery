// boost-config.js
export const BOOST_PRICES = {
    daily: { 1: 50, 2: 45, 3: 35, 4: 25, 5: 20 },
    weekly: { 1: 200, 2: 160, 3: 140, 4: 120, 5: 100 },
    super: { 3: 350, 4: 325, 5: 300 }
};

export const BOOST_DURATIONS = {
    daily: 24 * 60 * 60 * 1000,
    weekly: 7 * 24 * 60 * 60 * 1000,
    super: 24 * 60 * 60 * 1000
};
