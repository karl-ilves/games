import { yardService } from '../../../shared/yardService';

export function setupAdminReview(id: string) {
    document.getElementById('btn-review-approve')?.addEventListener('click', async () => {
        await yardService.updateGameStatus(id, 'approved');
        alert('✅ Game Approved! It is now live on the Playard Hub.');
        window.location.href = '../../index.html';
    });

    document.getElementById('btn-review-reject')?.addEventListener('click', async () => {
        const reason = prompt('Optional rejection reason:', '') || '';
        await yardService.updateGameStatus(id, 'rejected', reason);
        alert('❌ Game Rejected.');
        window.location.href = '../../index.html';
    });

    document.getElementById('btn-review-changes')?.addEventListener('click', async () => {
        const feedback = prompt('What changes should the creator make?', 'Please improve world layout.');
        if (feedback) {
            await yardService.updateGameStatus(id, 'changes_requested', feedback);
            alert('⚠️ Feedback sent to creator.');
            window.location.href = '../../index.html';
        }
    });
}
