

# Mettre à jour la clé API Africa's Talking

## Diagnostic
Les logs confirment l'erreur : **"The supplied API key is invalid"**. La clé API stockée dans les secrets Supabase ne correspond pas à celle de ton compte AT.

## Action
Mettre à jour le secret `AFRICASTALKING_API_KEY` avec la nouvelle clé que tu viens de fournir :
`atsk_38e73bd6...`

Aucun changement de code nécessaire — la fonction `sendSmsAfricasTalking` est correcte, c'est uniquement la valeur du secret qui doit être mise à jour.

