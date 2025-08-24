interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function RulesModal({ isOpen, onClose }: RulesModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">📖 Règles du jeu</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="space-y-6">
            {/* Objectif */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                🎯 Objectif
              </h3>
              <p className="text-gray-600">
                Soyez le premier à aligner 3 pièces de votre couleur selon les conditions de victoire.
              </p>
            </section>

            {/* Conditions de victoire */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                🏆 Condition de victoire
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-green-800 font-medium mb-2">
                  ✅ 3 pièces de votre couleur alignées
                </p>
                <p className="text-sm text-green-700">
                  Ligne, colonne ou diagonale - peu importe les tailles
                </p>
              </div>
            </section>

            {/* Exceptions importantes */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                ⚠️ Exceptions importantes
              </h3>
              <div className="space-y-3">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 font-medium mb-1">
                    ❌ 3 couleurs différentes alignées
                  </p>
                  <p className="text-sm text-red-700">
                    Même si vous avez une pièce dans l'alignement
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-red-800 font-medium mb-1">
                    ❌ Pièce adverse plus grande interfère
                  </p>
                  <p className="text-sm text-red-700">
                    Si une pièce adverse plus grande est présente dans votre alignement
                  </p>
                </div>
              </div>
            </section>

            {/* Règles de placement */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                📏 Règles de placement
              </h3>
              <div className="space-y-2 text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">P</span>
                  <span>Petite pièce - peut aller partout</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">M</span>
                  <span>Moyenne pièce - peut aller sur case vide ou sur P</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-blue-500 font-bold">G</span>
                  <span>Grande pièce - peut aller sur case vide, P ou M</span>
                </div>
              </div>
            </section>

            {/* Inventaire */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                🎒 Inventaire
              </h3>
              <p className="text-gray-600">
                Chaque joueur dispose de <strong>3 pièces de chaque taille</strong> (3P + 3M + 3G) dans sa couleur.
              </p>
            </section>

            {/* Exemple */}
            <section>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                💡 Exemple
              </h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-blue-800 text-sm">
                  <strong>Victoire :</strong> P rouge + M rouge + G rouge alignés<br/>
                  <strong>Pas de victoire :</strong> P rouge + M rouge + G bleu alignés
                  (le G bleu interfère avec l'alignement rouge)
                </p>
              </div>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
          >
            Compris !
          </button>
        </div>
      </div>
    </div>
  );
}
