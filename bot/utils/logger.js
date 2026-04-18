'use strict';

// POURQUOI un logger maison et non winston/pino : chalk est déjà installé
// (dep prod), zéro dep supplémentaire. Format structuré suffisant pour
// la phase actuelle. Passage à pino en Phase 3 si volume de logs > 10k/h.

const chalk = require('chalk');

const LEVELS = {
  DEBUG : { label: 'DEBUG', color: chalk.gray,    priority: 0 },
  INFO  : { label: 'INFO ', color: chalk.cyan,    priority: 1 },
  WARN  : { label: 'WARN ', color: chalk.yellow,  priority: 2 },
  ERROR : { label: 'ERROR', color: chalk.red,     priority: 3 },
  BOT   : { label: 'BOT  ', color: chalk.magenta, priority: 1 },
};

// POURQUOI MIN_LEVEL en env var : permet de passer en DEBUG sans toucher au code
// et de désactiver le bruit DEBUG en prod sans recompiler. Default = INFO.
const MIN_PRIORITY = (LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LEVELS.INFO).priority;

function format(level, module, message) {
  const ts  = new Date().toISOString().replace('T', ' ').slice(0, 23);
  const lvl = LEVELS[level] ?? LEVELS.INFO;
  const mod = module ? chalk.white(`[${module}]`) : '';
  return `${chalk.dim(ts)} ${lvl.color(`[${lvl.label}]`)} ${mod} ${message}`;
}

function log(level, module, message) {
  const lvl = LEVELS[level] ?? LEVELS.INFO;
  if (lvl.priority < MIN_PRIORITY) return;

  const line = format(level, module, message);
  if (level === 'ERROR') {
    process.stderr.write(line + '\n');
  } else {
    process.stdout.write(line + '\n');
  }
}

// Interface publique — chaque module passe son nom comme premier arg.
// Exemple : logger.info('CommandHandler', '12 commandes chargées')
const logger = {
  debug : (mod, msg) => log('DEBUG', mod, msg),
  info  : (mod, msg) => log('INFO',  mod, msg),
  warn  : (mod, msg) => log('WARN',  mod, msg),
  error : (mod, msg) => log('ERROR', mod, msg),
  bot   : (mod, msg) => log('BOT',   mod, msg),

  // Raccourci pour les erreurs avec stack trace
  errorStack(mod, err) {
    log('ERROR', mod, err?.message ?? String(err));
    if (err?.stack) process.stderr.write(chalk.dim(err.stack) + '\n');
  },
};

module.exports = logger;
