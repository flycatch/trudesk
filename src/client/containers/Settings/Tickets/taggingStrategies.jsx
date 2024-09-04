import React from 'react';
import PropTypes from 'prop-types';
import axios from 'axios';
import Log from '../../../logger';
import { connect } from 'react-redux';
import { updateSetting, updateMultipleSettings } from 'actions/settings';
import helpers from 'lib/helpers';

import Button from 'components/Button';
import SettingItem from 'components/Settings/SettingItem';
import SettingSubItem from 'components/Settings/SettingSubItem';
import Zone from 'components/ZoneBox/zone';
import ZoneBox from 'components/ZoneBox';
import SingleSelect from 'components/SingleSelect';

class TaggingStrategies extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      taggerStrategyValue: '',
      percentage: '',
      count: '',
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
      if (!state.count || !state.percentage || !state.maximumThreshold || !state.minimumThreshold) {
        nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value']);
        stateObj.percentage =
          nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'percentage']) || '';
        stateObj.count = nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'count']) || '';
        stateObj.maximumThreshold =
          nextProps.settings.getIn(['settings', 'taggerStrategyOptions', 'value', 'maximumThreshold']) || '';
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
      <SettingItem
        title={'Ticket Tagging Strategy'}
        subtitle={'Strategies to tag tickets and its options.'}
        component={
          <Button
            text={'Save'}
            style={'success'}
            flat={true}
            waves={true}
            extraClass={'mt-10 right'}
            onClick={() => {}}
          />
        }
      >
        <form onSubmit={(e) => this.onOptionsSubmit(e)}>
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
    );
  }
}

TaggingStrategies.propTypes = {
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  settings: state.settings.settings,
});

export default connect(mapStateToProps, { updateSetting, updateMultipleSettings })(TaggingStrategies);
