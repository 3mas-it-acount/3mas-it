'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // حذف عمود priority من جدول errands
    await queryInterface.removeColumn('Errands', 'priority');
  },

  async down (queryInterface, Sequelize) {
    // إعادة عمود priority إذا لزم الأمر
    await queryInterface.addColumn('Errands', 'priority', {
      type: Sequelize.ENUM('low', 'medium', 'high', 'critical'),
      allowNull: false,
      defaultValue: 'medium'
    });
  }
}; 