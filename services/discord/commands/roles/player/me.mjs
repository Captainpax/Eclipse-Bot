import {SlashCommandSubcommandBuilder} from 'discord.js';
import {getPlayer} from '../../../users/usersHandler.mjs';
import {addToSignupQueue} from '../../../guilds/channelHandler.mjs';

export default {
    data: new SlashCommandSubcommandBuilder()
        .setName('me')
        .setDescription('Join the signup queue for the next Archipelago game.'),

    async execute(interaction) {
        try {
            const user = await getPlayer(interaction.user.id);
            const isLinked = !!user;

            if (!isLinked) {
                return interaction.reply({
                    content: '❌ You must use `/ec link` first to join the queue.',
                    ephemeral: true,
                });
            }

            const guildId = interaction.guildId;
            const result = addToSignupQueue(guildId, interaction.user.id);

            if (result === 'already') {
                return interaction.reply({
                    content: '⚠️ You’re already on the signup list!',
                    ephemeral: true,
                });
            }

            await interaction.reply('✅ You’ve been added to the signup queue!');
        } catch (err) {
            console.error('🔥 /ec me command error:', err);
            await interaction.reply({
                content: '❌ Unable to add you to the signup queue at this time.',
                ephemeral: true,
            });
        }
    },
};
