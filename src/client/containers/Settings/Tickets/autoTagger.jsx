import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { updateSetting, updateMultipleSettings } from 'actions/settings';
import helpers from 'lib/helpers';

import Button from 'components/Button';
import SettingItem from 'components/Settings/SettingItem';
import EnableSwitch from 'components/Settings/EnableSwitch';

class AutoTagger extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      host: '',
      userName: '',
      password: '',
    };
  }

  componentDidMount() {
    helpers.UI.inputs();
  }

  componentDidUpdate() {
    helpers.UI.reRenderInputs();
  }

  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.settings) {
      let stateObj = { ...state };
      if (!state.host) stateObj.host = nextProps.settings.getIn(['settings', 'taggerHost', 'value']) || '';
      if (!state.userName && !state.password){
        const basicToken = nextProps.settings.getIn(['settings', 'taggerBasictoken', 'value']) || ''; 
        const [userName, password] = window.atob(basicToken).split(':');
        stateObj.userName = userName || '';
        stateObj.password = password || '';
      }

      return stateObj;
    }

    return null;
  }

  getSetting(name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : '';
  }

  onAllowAutoTaggingChange(e) {
    this.props.updateSetting({
      name: 'autotagger:enable',
      value: e.target.checked,
      stateName: 'autotagger',
      noSnackbar: true,
    });
  }

  onHuggingFaceChange(e) {
    this.props.updateSetting({
      name: 'tagger:inference:enable',
      value: e.target.checked,
      stateName: 'taggerInference',
      noSnackbar: true,
    });
  }

  onInputValueChanged(e, stateName) {
    this.setState({
      [stateName]: e.target.value,
    });
  }

  onAutoTagSubmit(e) {
    e.preventDefault();

    const autoTagSettings = [
      { name: 'ai:host', value: this.state.host },
      {
        name: 'ai:basicToken',
        value: window.btoa(`${this.state.userName}:${this.state.password}`),
      },
    ];

    this.props.updateMultipleSettings(autoTagSettings);
  }

  render() {
    return (
      <SettingItem
        title={'Auto Tagging'}
        subtitle={'Allow auto tagging of tickets.'}
        component={
          <EnableSwitch
            stateName={'autotagger'}
            label={'Enable'}
            onChange={(e) => this.onAllowAutoTaggingChange(e)}
            checked={this.getSetting('autotagger')}
          />
        }
      >
        <form onSubmit={(e) => this.onAutoTagSubmit(e)}>
          <div className="uk-clearfix uk-margin-medium-bottom">
            <div className="uk-float-left">
              <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                Use Hugging Face
              </h6>
              <h5 style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }} className={'uk-text-muted'}>
                Call hugging face inference API for model queries instead of locally running model
              </h5>
            </div>
            <div className="uk-float-right">
              <EnableSwitch
                label={'Enable'}
                stateName={'taggerInference'}
                checked={this.getSetting('taggerInference')}
                onChange={(e) => this.onHuggingFaceChange(e)}
                disabled={!this.getSetting('autotagger')}
              />
            </div>
            <hr style={{ float: 'left', marginTop: '10px' }} />
          </div>
          <div className={'uk-margin-medium-bottom'}>
            <label>Host</label>
            <input
              type="text"
              className={'md-input md-input-width-medium'}
              name={'autoTaggingHost'}
              disabled={!this.getSetting('autotagger')}
              value={this.state.host ?? ''}
              onChange={(e) => this.onInputValueChanged(e, 'host')}
            />
          </div>
          <div className="uk-margin-medium-bottom">
            <label>Username</label>
            <input
              type="text"
              className={'md-input md-input-width-medium'}
              name={'userName'}
              disabled={!this.getSetting('autotagger')}
              value={this.state.userName ?? ''}
              onChange={(e) => this.onInputValueChanged(e, 'userName')}
            />
          </div>
          <div className="uk-margin-medium-bottom">
            <label>Auth Password</label>
            <input
              type="password"
              className={'md-input md-input-width-medium'}
              name={'password'}
              disabled={!this.getSetting('autotagger')}
              value={this.state.password ?? ''}
              onChange={(e) => this.onInputValueChanged(e, 'password')}
            />
          </div>
          <div className="uk-clearfix">
            <Button
              text={'Apply'}
              type={'submit'}
              style={'success'}
              extraClass={'uk-float-right'}
              disabled={!this.getSetting('autotagger')}
              waves={true}
              flat={true}
            />
          </div>
        </form>
      </SettingItem>
    );
  }
}

AutoTagger.propTypes = {
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  settings: state.settings.settings,
});

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(AutoTagger);
