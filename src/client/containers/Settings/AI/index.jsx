import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { updateSetting, updateMultipleSettings } from 'actions/settings';
import helpers from 'lib/helpers';

import Button from 'components/Button';
import SettingItem from 'components/Settings/SettingItem';
import SettingSubItem from 'components/Settings/SettingSubItem';
import Zone from 'components/ZoneBox/zone';
import ZoneBox from 'components/ZoneBox';
import SingleSelect from 'components/SingleSelect';
import AIConfig from './config';
import EnableSwitch from 'components/Settings/EnableSwitch';

class AISettings extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      taggerStrategyValue: '',
      percentage: '',
      count: props.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'count']) || '',
      minimumThreshold: '',
      maximumThreshold: '',
      selectedStrategyOptions: [],
    };
    this.strategyOptions = {
      'top-n': [
        {
          field: 'count',
          name: 'Count',
          type: 'number',
        },
      ],
      'top-percent': [
        {
          field: 'percentage',
          name: 'Percentage',
          type: 'number',
        },
      ],
      threshold: [
        {
          field: 'minimumThreshold',
          name: 'Minimum Threshold',
          type: 'number',
        },
        {
          field: 'maximumThreshold',
          name: 'Maximum Threshold',
          type: 'number',
        },
      ],
    };
  }

  componentDidMount() {
    helpers.UI.inputs();
  }

  componentDidUpdate(_, prevState) {
    helpers.UI.reRenderInputs();
    if (prevState.taggerStrategyValue !== this.state.taggerStrategyValue) {
      if (this.state.taggerStrategyValue) {
        const selectedStrategyOptions = this.strategyOptions[this.state.taggerStrategyValue];
        this.setState({ selectedStrategyOptions });
      }
    }
  }

  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.settings) {
      let stateObj = { ...state };
      if (!state.taggerStrategyValue) {
        stateObj.taggerStrategyValue = nextProps.settings.getIn(['settings', 'taggerStrategy', 'value']) || '';
      }
      if (!state.count) {
        stateObj.count = nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'count']) || '';
      }
      if (!state.percentage) {
        stateObj.percentage =
          nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'percentage']) || '';
      }
      if (!state.maximumThreshold) {
        stateObj.maximumThreshold =
          nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'maximumThreshold']) || '';
      }
      if (!state.minimumThreshold) {
        stateObj.minimumThreshold =
          nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'minimumThreshold']) || '';
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

  onSemanticSearchChange(e) {
    this.props.updateSetting({
      name: 'semanticsearch:enable',
      value: e.target.checked,
      stateName: 'semanticSearchEnabled',
      noSnackbar: true,
    });
  }

  onInputValueChanged(e, stateName) {
    this.setState({
      [stateName]: e.target.value,
    });
  }

  onOptionsSubmit(e) {
    e.preventDefault();

    const { count, minimumThreshold, maximumThreshold, percentage } = this.state;
    const autoTagOptions = [
      { name: 'tagger:strategy', value: this.state.taggerStrategyValue },
      {
        name: 'tagger:strategy:options',
        value: {
          count: Number(count),
          minimumThreshold: Number(minimumThreshold),
          maximumThreshold: Number(maximumThreshold),
          percentage: Number(percentage),
        },
      },
    ];
    this.props.updateMultipleSettings(autoTagOptions);
  }

  render() {
    const mappedStartegies = Object.keys(this.strategyOptions).map((strategy) => ({
      value: strategy,
      text: strategy[0].toUpperCase() + strategy.slice(1),
    }));
    const { selectedStrategyOptions } = this.state;
    return (
      <div className={this.props.active ? '' : 'hide'}>
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
          <form onSubmit={(e) => this.onOptionsSubmit(e)}>
            <div className="uk-clearfix uk-margin-medium-bottom">
              <div className="uk-float-left">
                <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                  Ticket Tagging Strategy
                </h6>
                <h5
                  style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                  className={'uk-text-muted'}
                >
                  Strategies to tag tickets and its options.
                </h5>
              </div>
            </div>
            <Zone>
              <ZoneBox>
                <SettingSubItem
                  title="Strategy"
                  subtitle="Select strategy for ticket tagging"
                  component={
                    <SingleSelect
                      items={mappedStartegies}
                      value={this.state.taggerStrategyValue}
                      defaultValue={this.state.taggerStrategyValue}
                      onSelectChange={(e) => {
                        this.onInputValueChanged(e, 'taggerStrategyValue');
                      }}
                      width={'50%'}
                      showTextbox={false}
                    />
                  }
                />
              </ZoneBox>
              {!!selectedStrategyOptions.length &&
                selectedStrategyOptions.map((option) => (
                  <ZoneBox key={option.name}>
                    <div>
                      <label>{option.name}</label>
                      <input
                        type={option.type}
                        className={'md-input md-input-width-medium'}
                        required
                        name={option.field}
                        value={this.state[option.field]}
                        onChange={(e) => this.onInputValueChanged(e, option.field)}
                      />
                    </div>
                  </ZoneBox>
                ))}
            </Zone>
            <div className="uk-clearfix">
              <Button
                text={'Save'}
                type={'submit'}
                style={'success'}
                extraClass={'uk-float-right'}
                waves={true}
                flat={true}
              />
            </div>
          </form>
        </SettingItem>

        <SettingItem
          title={'Enable Semantic Search'}
          subtitle={<div>Turn On to use NLP to provide relevant results and answers based on semantics, not just lexical analysis.</div>}
          tooltip={'Ensure that the Elastic Search option is enabled for semantic search to be turned on.'}
          component={
            <EnableSwitch
              stateName={'semanticSearchEnabled'}
              label={'Enable'}
              checked={this.getSetting('semanticSearchEnabled')}
                onChange={(e) => {
                  this.onSemanticSearchChange(e);
                }}
            />
          }
        />
        <AIConfig />
      </div>
    );
  }
}

AISettings.propTypes = {
  active: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  settings: state.settings.settings,
});

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(AISettings);
