import { assert } from '../../common/index.js';

export class RepositorySettings {
  /**
   * @param {string} repoUuid
   * @param {boolean|number} isFavorite
   * @param {string} color
   * @param {string} name
   * @param {boolean|number} isActive
   * @param {string} url
   * @param {string} authToken
   * @param {string} type
   * @param {boolean} enableSchedule
   * @param {number} cadenceValue
   * @param {string} cadenceUnit
   * @param {Date} startDate
   */
  constructor(
    repoUuid,
    isFavorite,
    color,
    name,
    isActive,
    url,
    authToken,
    type,
    enableSchedule,
    cadenceValue,
    cadenceUnit,
    startDate
  ) {
    this.uuid = repoUuid;
    this.isFavorite = !!isFavorite;
    this.color = color || '#bababa';
    this.name = name;
    this.isActive = !!isActive;
    this.url = url;
    this.authToken = authToken;
    this.type = type;
    this.enableSchedule = enableSchedule;
    this.scheduleCadenceValue = enableSchedule ? cadenceValue : 1;
    this.scheduleCadenceUnit = enableSchedule ? cadenceUnit : 'days';
    this.scheduleStartTime = this._toDateTimeLocalFormat(enableSchedule ? startDate : new Date());

    if (this.color[0] !== '#') {
      this.color = '#' + this.color;
    }

    if (this.scheduleCadenceUnit === 'seconds') {
      this._findLargestCadenceUnitFromSeconds();
    }

    this.updateFlags();
  }

  static fromServiceSettings(
    repoUuid,
    repoSettings,
    userSettings,
    apiBridgeSettings,
    schedulerSettings
  ) {
    const { is_active } = repoSettings;
    const { is_favorite, color } = userSettings;
    const { name, authToken, url, type } = apiBridgeSettings;
    const { enableSchedule, cadence, startDate } = schedulerSettings;

    return new RepositorySettings(
      repoUuid,
      is_favorite,
      color,
      name,
      is_active,
      url,
      authToken,
      type,
      enableSchedule,
      cadence,
      'seconds',
      startDate
    );
  }

  static fromFormBody(repoUuid, body) {
    return new RepositorySettings(
      repoUuid,
      !!(body.isFavorite || ''),
      body.repoColor,
      body.repoName || '',
      !!(body.isActive || ''),
      body.repoUrl || '',
      body.repoAuthToken || '',
      body.repoType || 'gitlab',
      !!(body.enableSchedule || ''),
      body.scheduleCadenceValue || 0,
      body.scheduleCadenceUnit || 'days',
      body.scheduleStartTime || ''
    );
  }

  /**
   * Converts formats a date object value according to a <input type="datetime-local"> element.
   * Empty strings are ignored
   * @param {Date|string} date
   */
  _toDateTimeLocalFormat(date) {
    // Assume strings are formatted correctly already
    if (typeof date === 'string' && !date) {
      return date;
    }

    // Cut off everything after the minute value from the ISO date string
    // --> `${year}-${month}-${day}T${hours}:${minutes}`
    const isoDate = new Date(date).toISOString();
    const idx = isoDate.lastIndexOf(':');
    return isoDate.substring(0, idx);
  }

  /**
   * When the cadence unit is currently in seconds, the method finds
   * the largest time unit possible to divide the cadence time without
   * any rest and updates the cadence value & unit.
   */
  _findLargestCadenceUnitFromSeconds() {
    assert(this.scheduleCadenceUnit === 'seconds');

    // Cadence is given in seconds, calculate hours
    let cadenceValue = this.scheduleCadenceValue / 60 / 60;
    let cadenceUnit = 'hours';

    // Check if cadence is given in full days
    if (cadenceValue >= 24 && cadenceValue % 24 === 0) {
      cadenceValue = cadenceValue / 24;
      cadenceUnit = 'days';

      // Check if cadence is given in full weeks
      if (cadenceValue >= 7 && cadenceValue % 7 === 0) {
        cadenceValue = cadenceValue / 7;
        cadenceUnit = 'weeks';
      }
    }

    this.scheduleCadenceValue = cadenceValue;
    this.scheduleCadenceUnit = cadenceUnit;
  }

  /**
   * Returns the factor necessary to convert the current cadence value
   * into a time in seconds.
   * @returns {number}
   */
  _scheduleCadenceUnitFactor() {
    switch (this.scheduleCadenceUnit) {
      case 'hours':
        return 60 * 60;
      case 'days':
        return 60 * 60 * 24;
      case 'weeks':
        return 60 * 60 * 24 * 7;
      default:
        return 60 * 60;
    }
  }

  scheduleCadenceValueInSeconds() {
    const factor = this._scheduleCadenceUnitFactor();
    return factor * this.scheduleCadenceValue;
  }

  /**
   * Returns the repository color without the leading '#'
   * @returns {string}
   */
  colorHexPart() {
    return this.color.substring(1);
  }

  toApiBridgeSettings() {
    return {
      name: this.name,
      url: this.url,
      type: this.type,
      authToken: this.authToken
    };
  }

  toRepoServiceSettings() {
    return {
      name: this.name,
      type: this.type,
      gitUrl: this.url + '.git',
      authToken: this.authToken
    };
  }

  /**
   * Sets the boolean flags used by the handlebars file based on the
   * current settings.
   */
  updateFlags() {
    this.isGitLab = this.type === 'gitlab';

    this.isCadenceInHours = this.scheduleCadenceUnit === 'hours';
    this.isCadenceInDays = this.scheduleCadenceUnit === 'days';
    this.isCadenceInWeeks = this.scheduleCadenceUnit === 'weeks';
  }
}
