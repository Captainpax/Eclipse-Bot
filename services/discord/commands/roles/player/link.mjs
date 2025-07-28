// services/discord/commands/roles/player/link.mjs

import {linkUser} from '../../../users/usersHandler.mjs';

/**
 * Links a Discord user to an Archipelago slot
 * Usage: !link <slot_name>
 */
export default async function (message, args) {
    const slotName = args.join(' ').trim();

    if (!slotName) {
        return message.reply('❌ Usage: `!link <slot_name>`');
    }

    const result = linkUser(message.author.id, slotName);
    if (result) {
        return message.reply(`✅ Linked your Discord to **${slotName}**.`);
    } else {
        return message.reply('⚠️ Failed to link account. Try again or contact an admin.');
    }
}
