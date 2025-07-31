import {ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder} from 'discord.js';

/**
 * Presents the user with a list of servers (guilds) they own.
 *
 * After deferring the reply, this function filters the client's guild cache to
 * only include servers where the interacting user is the owner. If no
 * servers are found, it notifies the user accordingly. Otherwise it
 * constructs a select menu listing the guilds by name and ID and sends
 * it back to the DM channel.
 *
 * @param {Interaction} interaction The incoming interaction
 * @param {Client} client The Discord client instance
 * @param {Object} session The per‑user setup session state
 */
export async function handleServerSelection(interaction, client, session) {
    await interaction.deferReply({flags: 64});
    const guildChoices = client.guilds.cache
        .filter(g => g.ownerId === interaction.user.id)
        .map(g => ({label: g.name, description: `ID: ${g.id}`, value: g.id}));
    if (!guildChoices.length) {
        return interaction.editReply({content: '❌ No owned servers found.'});
    }
    const menu = new StringSelectMenuBuilder()
        .setCustomId('setup_select_guild')
        .setPlaceholder('Select your server')
        .addOptions(guildChoices);
    session.step = 2;
    return interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('Step 1️⃣ - Server').setDescription('Choose a server to configure.').setColor(0x5865F2)],
        components: [new ActionRowBuilder().addComponents(menu)]
    });
}