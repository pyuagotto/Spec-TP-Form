//@ts-check
import { world, system, GameMode, Player, CustomCommandOrigin, CustomCommandStatus, CommandPermissionLevel } from '@minecraft/server';
import { ModalFormData } from '@minecraft/server-ui';

const ERROR_MESSAGES = {
    NOT_PLAYER: "このコマンドはプレイヤーから実行してください！",
    NOT_SPECTATOR: "このコマンドはスペクテイター状態でないと実行できません！",
    NO_PLAYERS: "テレポート可能なプレイヤーが存在しません！"
};

/**
 * スペクテイター以外のプレイヤーリストを取得
 * @returns {Player[]} プレイヤーリスト
 */
const getPlayersExcludingSpectator = function() {
    return Array.from(world.getPlayers({ excludeGameModes: [GameMode.spectator] }));
}

/**
 * プレイヤーにモーダルフォームを表示して選択結果を処理
 * @param {Player} source 実行プレイヤー
 * @param {string[]} players プレイヤー名リスト
 */
const showTeleportForm = function(source, players) {
    const modalForm = new ModalFormData();
    modalForm.title("テレポート先");
    modalForm.dropdown("\n\nプレイヤー一覧", players);

    system.run(() => {
        modalForm.show(source).then(modalFormResponse => {
            const { formValues } = modalFormResponse;
            if (formValues && typeof formValues[0] === 'number') {
                const targetPlayerName = players[formValues[0]];
                const targetPlayer = getPlayersExcludingSpectator().find(player => player.name === targetPlayerName);
                if (targetPlayer) {
                    source.teleport(targetPlayer.location, { dimension: targetPlayer.dimension });
                }
            }
        });
    });
}

/**
 * スペクテイターモード専用コマンド
 * @param {CustomCommandOrigin} origin 
 * @returns { { status: CustomCommandStatus, message?: string } }
 */
const spec = function(origin) {
    if (!(origin.sourceEntity instanceof Player)) {
        return { status: CustomCommandStatus.Failure, message: ERROR_MESSAGES.NOT_PLAYER };
    }

    const source = origin.sourceEntity;

    if (source.getGameMode() !== GameMode.spectator) {
        return { status: CustomCommandStatus.Failure, message: ERROR_MESSAGES.NOT_SPECTATOR };
    }

    const players = getPlayersExcludingSpectator().map(player => player.name);

    if (players.length === 0) {
        return { status: CustomCommandStatus.Failure, message: ERROR_MESSAGES.NO_PLAYERS };
    }

    showTeleportForm(source, players);
    return { status: CustomCommandStatus.Success };
}


system.beforeEvents.startup.subscribe((ev) => {
    /**
     * コマンドを登録
     * @param {string} name 
     * @param {string} description 
     * @param {(origin: CustomCommandOrigin) => { status: CustomCommandStatus }} callback 
     */
    const registerCommand = function (name, description, callback) {
        ev.customCommandRegistry.registerCommand(
            {
                name,
                description,
                permissionLevel: CommandPermissionLevel.Any,
            },
            callback
        );
    };

    registerCommand(
        "pyuagotto:spec",
        "テレポート先を選択します",
        spec
    );
});