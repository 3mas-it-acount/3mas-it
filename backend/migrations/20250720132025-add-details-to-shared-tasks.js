'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('shared_tasks', 'completed_at', {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('shared_tasks', 'completed_by', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn('shared_tasks', 'completion_history', {
      type: Sequelize.TEXT,
      allowNull: true,
      defaultValue: null,
    });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('shared_tasks', 'completed_at');
    await queryInterface.removeColumn('shared_tasks', 'completed_by');
    await queryInterface.removeColumn('shared_tasks', 'completion_history');
  }
};
