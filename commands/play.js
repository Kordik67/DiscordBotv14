const { SlashCommandBuilder } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const https = require('node:https');
const {
	generateDependencyReport,
	getVoiceConnection,
	AudioPlayerStatus,
	entersState,
	joinVoiceChannel,  
	createAudioPlayer,
	createAudioResource,
	VoiceConnectionStatus } = require('@discordjs/voice');

// Peut aussi être utilisé avec le nom du fichier à jouer

module.exports = {
	data: new SlashCommandBuilder()
		.setName('play')
		.setDescription('Download the mp3/mp4 file provided and play it')
		.addAttachmentOption(option => 
			option
				.setName('file')
				.setDescription('file to play (mp3/mp4 format)')
				.setRequired(true)),

	async execute(interaction) {
		// Check if member is inside voice channel
		if (interaction.member.voice.channel === null)
			return interaction.reply({ content: 'You need to be inside a voice channel.', ephemeral: true });

		const providedFile = interaction.options.getAttachment('file');
		const songsPath = path.join(__dirname, '../songs');
		const songFiles = fs.readdirSync(songsPath).filter(file => file === providedFile.name);
		const voiceChannel = interaction.member.voice.channel;

		if (songFiles.length != 0) { // Check if song is already downloaded
			//interaction.reply({ content: 'Playing it now...', ephemeral: true });
			playAudio(songFiles[0], songsPath, voiceChannel.id, interaction.guild.id, interaction.guild.voiceAdapterCreator);
		} else if (providedFile.name.endsWith('.mp3') || providedFile.name.endsWith('.mp4')) { // Is it a mp3/mp4 file ?
			try {
				const file = fs.createWriteStream(`${songsPath}/${providedFile.name}`);
				const request = https.get(`${providedFile.url}`, function(response) {
					response.pipe(file);

					// After download completed, close filestream
					file.on('finish', async () => {
						await file.close();

						playAudio(providedFile.name, songsPath, voiceChannel.id, interaction.guild.id, interaction.guild.voiceAdapterCreator);
					});
				});
			} catch(error) {
				console.error(error);
			}
		} else { // Don't accept other files
			return interaction.reply({ content: 'Format not supported. Use mp3 or mp4 only.', ephemeral: true });
		}
	}
}

async function playAudio(filename, songsPath, channelId, guildId, adapterCreator) {
	// Join the voice channel and play the file
	const voiceConnection = joinVoiceChannel({
		channelId: channelId,
		guildId: guildId,
		adapterCreator: adapterCreator
	});

	const connection = getVoiceConnection(guildId);
	const player = createAudioPlayer();
	const resource = createAudioResource(`${songsPath}/${filename}`);

	try {
		await entersState(voiceConnection, VoiceConnectionStatus.Ready, 5000);
	} catch (err) {
		console.log(`Voice connection not ready within 5s : ${err}`);
		return null;
	}

	connection.subscribe(player);
	player.play(resource);

	player.on('error', err => {
		console.error(err);
	});
}