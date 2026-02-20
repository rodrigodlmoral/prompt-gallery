/**
 * EconomyDashboard.js
 * 
 * Economy overview panel for the user's profile.
 * Shows balance, earned/spent stats, and recent transactions.
 * Rendered as a collapsible section on the profile page.
 */

import { store } from '../store-final.js';
import { getNextMilestone, COPY_MILESTONES } from '../lib/CopyBonusSystem.js';

// Format relative time with safety check
function timeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return 'fecha desconocida'; // Fallback for invalid dates

    const now = Date.now();
    const diff = now - date.getTime();
    const mins = Math.floor(diff / 60000);

    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

// Format full date and time
function formatFullDateTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    try {
        // Example: "17 Feb, 00:36"
        return date.toLocaleString('es-MX', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        }).replace('.', '');
    } catch (e) {
        // Ultra-safe fallback
        return date.toISOString().slice(5, 16).replace('T', ' ');
    }
}

/**
 * Render the Economy Dashboard HTML
 */
export function renderEconomyDashboard(stats) {
    if (!stats) return '';

    const level = store.currentUser?.level || 0;

    // Final safety sort: Most recent first
    const sortedTxs = [...(stats.transactions || [])].sort((a, b) => new Date(b.date) - new Date(a.date));

    return `
    <div id="economyDashboard" class="economy-dashboard" style="
        background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%);
        border: 1px solid #2a2a5a;
        border-radius: 16px;
        padding: 24px;
        margin: 20px 0;
    ">
        <h3 style="color:#fff; margin:0 0 20px 0; font-size:1.2rem; display:flex; align-items:center; gap:8px">
            💰 Economía PromptBits
            <span style="font-size:0.75rem; background:rgba(168,85,247,0.2); color:#a855f7; padding:3px 10px; border-radius:20px">Nivel ${level}</span>
        </h3>

        <!-- Stats Cards Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:12px; margin-bottom:20px">
            <!-- Balance -->
            <div style="background:linear-gradient(135deg, #a855f7, #6366f1); border-radius:12px; padding:16px; text-align:center">
                <div style="font-size:1.8rem; font-weight:700; color:#fff">${stats.currentBalance}</div>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.8)">💎 Balance Actual</div>
            </div>

            <!-- Earned -->
            <div style="background:linear-gradient(135deg, #22c55e, #10b981); border-radius:12px; padding:16px; text-align:center">
                <div style="font-size:1.8rem; font-weight:700; color:#fff">+${stats.totalEarned}</div>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.8)">📥 Total Ganado</div>
            </div>

            <!-- Spent -->
            <div style="background:linear-gradient(135deg, #ef4444, #dc2626); border-radius:12px; padding:16px; text-align:center">
                <div style="font-size:1.8rem; font-weight:700; color:#fff">-${stats.totalSpent}</div>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.8)">📤 Total Gastado</div>
            </div>

            <!-- Net Flow -->
            <div style="background:linear-gradient(135deg, ${stats.netFlow >= 0 ? '#f59e0b, #d97706' : '#6b7280, #4b5563'}); border-radius:12px; padding:16px; text-align:center">
                <div style="font-size:1.8rem; font-weight:700; color:#fff">${stats.netFlow >= 0 ? '+' : ''}${stats.netFlow}</div>
                <div style="font-size:0.75rem; color:rgba(255,255,255,0.8)">${stats.netFlow >= 0 ? '📈' : '📉'} Flujo Neto</div>
            </div>
        </div>

        <!-- Breakdown Grid -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap:10px; margin-bottom:20px">
            <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:12px; text-align:center">
                <div style="font-size:1.1rem; font-weight:600; color:#a855f7">${stats.totalReceived}</div>
                <div style="font-size:0.7rem; color:#888">Propinas Recibidas</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:12px; text-align:center">
                <div style="font-size:1.1rem; font-weight:600; color:#ef4444">${stats.totalSent}</div>
                <div style="font-size:0.7rem; color:#888">Propinas Enviadas</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:12px; text-align:center">
                <div style="font-size:1.1rem; font-weight:600; color:#3b82f6">${stats.totalGifts}</div>
                <div style="font-size:0.7rem; color:#888">Gifts/Premios recibidos</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:12px; text-align:center">
                <div style="font-size:1.1rem; font-weight:600; color:#22c55e">${stats.totalBonuses}</div>
                <div style="font-size:0.7rem; color:#888">Bonos por Copias</div>
            </div>
            <div style="background:rgba(255,255,255,0.05); border-radius:10px; padding:12px; text-align:center">
                <div style="font-size:1.1rem; font-weight:600; color:#f59e0b">${stats.transactionCount}</div>
                <div style="font-size:0.7rem; color:#888">Total Transacciones</div>
            </div>
        </div>

        <!-- Recent Transactions -->
        ${sortedTxs.length > 0 ? `
        <div>
            <h4 style="color:#999; font-size:0.8rem; text-transform:uppercase; letter-spacing:0.05em; margin:0 0 12px 0">
                Transacciones Recientes
            </h4>
            <div style="max-height:300px; overflow-y:auto; scrollbar-width:thin; scrollbar-color:#333 transparent">
                ${sortedTxs.map(tx => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px; border-bottom:1px solid rgba(255,255,255,0.05); transition:background 0.2s"
                         onmouseover="this.style.background='rgba(255,255,255,0.03)'"
                         onmouseout="this.style.background='transparent'">
                        <span style="font-size:1.2rem">${tx.icon}</span>
                        <div style="flex:1; min-width:0">
                            <div style="font-size:0.9rem; color:#fff; font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-bottom:2px">${tx.description}</div>
                            <div style="font-size:0.75rem; color:#aaa; display:flex; align-items:center; gap:6px">
                                <span>${timeAgo(tx.date)}</span>
                                <span style="color:#eee; background:rgba(255,255,255,0.1); padding:1px 6px; border-radius:4px; font-weight:600">
                                    ${formatFullDateTime(tx.date)}
                                </span>
                            </div>
                        </div>
                        <div style="font-size:0.95rem; font-weight:600; color:${tx.amount >= 0 ? '#22c55e' : '#ef4444'}; white-space:nowrap">
                            ${tx.amount >= 0 ? '+' : ''}${tx.amount} 💎
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : `
        <div style="text-align:center; padding:20px; color:#666; font-size:0.9rem">
            <div style="font-size:2rem; margin-bottom:8px">📊</div>
            Aún no tienes transacciones.
            <br><span style="font-size:0.8rem">Publica prompts y recibe copias para ganar PromptBits.</span>
        </div>
        `}
    </div>
    `;
}

/**
 * Initialize the Economy Dashboard on the profile page.
 * Fetches stats and injects the dashboard HTML.
 */
export async function initEconomyDashboard(containerId = 'economyDashboardContainer') {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!store.currentUser) {
        container.innerHTML = '';
        return;
    }

    // Show loading state
    container.innerHTML = `
        <div style="background:linear-gradient(135deg, #0f0f23 0%, #1a1a3e 100%); border:1px solid #2a2a5a; border-radius:16px; padding:24px; margin:20px 0; text-align:center; color:#888">
            <div style="font-size:1.5rem; margin-bottom:8px">💰</div>
            Cargando economía...
        </div>
    `;

    try {
        const stats = await store.getEconomyStats();
        container.innerHTML = renderEconomyDashboard(stats);
    } catch (err) {
        console.error('[ECONOMY_DASHBOARD] Failed to load:', err);
        container.innerHTML = `
            <div style="background:rgba(239,68,68,0.1); border:1px solid rgba(239,68,68,0.3); border-radius:12px; padding:16px; margin:20px 0; color:#ef4444; text-align:center; font-size:0.9rem">
                ❌ No se pudieron cargar las estadísticas de economía.
            </div>
        `;
    }
}

/**
 * Refresh just the economy dashboard (after a transaction)
 */
export async function refreshEconomyDashboard() {
    await initEconomyDashboard();
}
