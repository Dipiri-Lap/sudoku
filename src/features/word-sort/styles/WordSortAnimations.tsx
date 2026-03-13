export const WordSortAnimations = () => (
    <style>{`
        @keyframes flipAndMove {
            0% {
                transform: translateX(var(--startX, 150px)) rotateY(180deg);
                opacity: 1;
                z-index: 100;
            }
            15% {
                transform: translateX(var(--startX, 150px)) rotateY(0deg);
                opacity: 1;
            }
            100% {
                transform: translateX(0) rotateY(0deg);
                opacity: 1;
                z-index: 5;
            }
        }
        .animate-card-draw {
            animation: flipAndMove 0.6s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
            transform-style: preserve-3d;
            backface-visibility: hidden;
        }
        @keyframes slotComplete {
            0%   { transform: scale(1);     box-shadow: 0 0 0px rgba(255,215,0,0); }
            20%  { transform: scale(1.12);  box-shadow: 0 0 28px rgba(255,215,0,0.9); }
            45%  { transform: scale(0.96);  box-shadow: 0 0 16px rgba(255,215,0,0.6); }
            65%  { transform: scale(1.06);  box-shadow: 0 0 22px rgba(255,215,0,0.8); }
            80%  { transform: scale(0.99);  box-shadow: 0 0 10px rgba(255,215,0,0.4); }
            100% { transform: scale(1);     box-shadow: 0 0 0px rgba(255,215,0,0); }
        }
        .animate-slot-complete {
            animation: slotComplete 0.9s cubic-bezier(0.2, 0.8, 0.4, 1) forwards;
        }
        @keyframes dealCard {
            0% {
                transform: translate(var(--deal-from-x, 150px), var(--deal-from-y, -100px)) scale(0.85) rotate(-3deg);
                opacity: 0.8;
            }
            100% {
                transform: translate(0, 0) scale(1) rotate(0deg);
                opacity: 1;
            }
        }
        .deal-animation {
            animation: dealCard 0.3s cubic-bezier(0.2, 0.8, 0.3, 1) forwards !important;
        }
        @keyframes tutorialPulse {
            0%, 100% {
                outline-color: rgba(74, 222, 128, 0.5);
                box-shadow: 0 0 12px rgba(74, 222, 128, 0.3);
            }
            50% {
                outline-color: #4ade80;
                box-shadow: 0 0 26px rgba(74, 222, 128, 0.75);
            }
        }
        .tutorial-highlight {
            animation: tutorialPulse 1.2s ease-in-out infinite !important;
            outline: 3px solid rgba(74, 222, 128, 0.5);
            outline-offset: 2px;
            position: relative;
            z-index: 200 !important;
        }
        @keyframes gatherToCenter {
            0% { transform: translate(0, 0) scale(1); opacity: 1; }
            0.1% { z-index: 5000; }
            100% {
                transform: translate(var(--gather-x, 0px), var(--gather-y, 0px)) scale(1);
                opacity: 1;
                z-index: 5000;
            }
        }
        .gathering-animation {
            animation: gatherToCenter 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards !important;
            animation-delay: var(--gather-delay, 0s) !important;
            pointer-events: none;
            transition: none !important;
        }
        @keyframes revealCard {
            0% { opacity: 1; }
            100% { opacity: 0; }
        }
        .reveal-overlay {
            position: absolute;
            inset: 0;
            z-index: 10;
            border-radius: 3px;
            animation: revealCard 0.1s forwards !important;
            pointer-events: none;
        }
        .central-glow {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150px;
            height: 200px;
            border-radius: 12px;
            background: rgba(255, 215, 0, 0.3);
            box-shadow: 0 0 50px 20px rgba(255, 215, 0, 0.5);
            z-index: 4500;
            animation: centralGlowPulse 0.8s ease-out forwards;
        }
        @keyframes centralGlowPulse {
            0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0; }
            50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
            100% { transform: translate(-50%, -50%) scale(1.1); opacity: 0; }
        }
    `}</style>
);
