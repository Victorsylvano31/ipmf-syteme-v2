import google.generativeai as genai 
from decouple import config
import logging
from .ai_functions import AVAILABLE_FUNCTIONS

logger = logging.getLogger(__name__)

class GeminiService:
    """
    Service pour interagir avec Google Gemini Pro
    """
    def __init__(self):
        api_key = config('GOOGLE_API_KEY', default=None)
        if api_key:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None
            logger.warning("GOOGLE_API_KEY non configurée dans le .env")

    def generate_response(self, prompt, system_instruction=None, history=None, user=None):
        if not self.model:
            return "Désolé, l'intelligence réelle de Sylva n'est pas encore activée (Clé API manquante)."

        try:
            formatted_history = []
            if history:
                for msg in history:
                    role = 'model' if msg.get('role') == 'assistant' else 'user'
                    formatted_history.append({
                        "role": role,
                        "parts": [msg.get('content')]
                    })
            
            # Définir les outils (fonctions) disponibles pour Gemini
            tools = [
                {
                    "function_declarations": [
                        {
                            "name": "valider_depenses_urgentes",
                            "description": "Valide automatiquement toutes les factures/dépenses en attente de validation du Directeur Général (statut 'verifiee' et montant élevé). À utiliser quand l'utilisateur demande de valider les dépenses ou factures urgentes en attente."
                        },
                        {
                            "name": "creer_tache",
                            "description": "Crée une nouvelle tâche et l'assigne à un utilisateur spécifique (agent).",
                            "parameters": {
                                "type": "object",
                                "properties": {
                                    "titre": {"type": "string", "description": "Le titre court de la tâche."},
                                    "description": {"type": "string", "description": "Les détails complets de la tâche à accomplir."},
                                    "assigne_a_username": {"type": "string", "description": "Le nom d'utilisateur (username) de l'agent qui doit faire la tâche (ex: 'nomenia', 'comptable')."},
                                    "priorite": {"type": "string", "description": "La priorité de la tâche: 'basse', 'moyenne', 'elevee', ou 'urgente'. Par défaut: 'moyenne'."}
                                },
                                "required": ["titre", "description", "assigne_a_username"]
                            }
                        }
                    ]
                }
            ]

            if system_instruction:
                self.model = genai.GenerativeModel(
                    'gemini-2.5-flash',
                    system_instruction=system_instruction,
                    tools=tools
                )
            else:
                 self.model = genai.GenerativeModel('gemini-2.5-flash', tools=tools)

            chat = self.model.start_chat(history=formatted_history)
            response = chat.send_message(prompt)
            
            # Gérer le Function Calling
            if response.candidates and response.candidates[0].content.parts:
                 for part in response.candidates[0].content.parts:
                     if hasattr(part, 'function_call') and part.function_call:
                         function_call = part.function_call
                         function_name = function_call.name
                         args = {k: v for k, v in function_call.args.items()}
                         
                         print(f"--- GEMINI DEMANDE UN FUNCTION CALL : {function_name} avec args: {args} ---")
                         
                         function_to_call = AVAILABLE_FUNCTIONS.get(function_name)
                         
                         if function_to_call:
                             # Injection de l'utilisateur actuel si nécessaire
                             if function_name == "valider_depenses_urgentes":
                                 # Injecter le user actuel
                                 function_response = function_to_call(user)
                             else:
                                 function_response = function_to_call(**args)
                             
                             # Renvoyer le résultat à Gemini pour qu'il formule sa réponse finale
                             response = chat.send_message(
                                 {
                                     "role": "function",
                                     "parts": [
                                         {
                                             "function_response": {
                                                 "name": function_name,
                                                 "response": {"resultat": function_response}
                                             }
                                         }
                                     ]
                                 }
                             )
                             return response.text
                         else:
                             return f"Je ne sais pas comment exécuter l'action '{function_name}'."
            
            return response.text
            
        except Exception as e:
            logger.error(f"Erreur Gemini: {str(e)}")
            import traceback
            traceback.print_exc()
            return "J'ai rencontré un problème technique en essayant d'exécuter cette action."

# Instance unique du service
gemini_service = GeminiService()
