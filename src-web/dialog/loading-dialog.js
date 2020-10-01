const React = require('react');

const LoadingDialog = () => {
  return (
    <div
      style={{
        fontFamily: 'monospace',
        position: 'fixed',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'rgba(0, 0, 0, 0.33)',
      }}
    >
      <div style={{ fontSize: '32px', color: 'white' }}>Loading...</div>
    </div>
  );
};

module.exports = LoadingDialog;
